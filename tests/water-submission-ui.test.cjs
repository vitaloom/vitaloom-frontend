const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { Fragment, jsx, jsxs } = require('react/jsx-runtime');

const sourceRoot = path.join(__dirname, '../src/features/water');
const flush = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Keep the Water components and hooks real. Model React's hook slots and effect cleanup
// using the same Node/VM approach as the existing Assistant unit tests.
function createFixture() {
  let current;
  let revision = 0;
  let backCalls = 0;
  let user = { id: 'ada' };
  const requests = [];
  const saves = [];
  const modules = new Map();
  const react = {
    useCallback: callback => callback,
    useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useState(initial) {
      const slot = current.slot++;
      const { state } = current;
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
      return [state[slot], next => {
        state[slot] = typeof next === 'function' ? next(state[slot]) : next;
      }];
    },
    useRef(initial) {
      return react.useState(() => ({ current: initial }))[0];
    },
    useEffect(effect, deps) {
      const slot = current.slot++;
      const previous = current.state[slot];
      if (previous && deps.every((dep, index) => Object.is(dep, previous.deps[index]))) return;
      previous?.cleanup?.();
      current.state[slot] = { deps, cleanup: effect() };
    },
  };
  const repo = {
    subscribe: () => () => {},
    getRevision: () => revision,
    getDailySummary(date) {
      const request = { date, ...deferred() };
      requests.push(request);
      return request.promise;
    },
    async createLog(input) {
      const request = { input, ...deferred() };
      saves.push(request);
      const result = await request.promise;
      revision++;
      return result;
    },
  };
  class ApiError extends Error {
    constructor(status) { super('API failure'); this.status = status; }
  }
  const layout = { screenMax: 520, waterHeaderMin: 112, waterHero: 260, quickTileMin: 72, progressRing: 200, progressStroke: 16 };
  const mocks = {
    react,
    'react/jsx-runtime': { Fragment, jsx, jsxs },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Image: 'Image', View: 'View',
      Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput',
      KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'web' }, useWindowDimensions: () => ({ fontScale: 1 }),
    },
    'expo-router': { router: { push() {}, back() { backCalls++; } }, useFocusEffect() {} },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'react-native-svg': { default: 'Svg', Circle: 'Circle', Path: 'Path' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/themed-text': { ThemedText: 'ThemedText' },
    '@/components/ui/health-metrics-sidebar': { HealthMetricsSidebar: 'Sidebar' },
    '@/features/auth/store/auth-context': { useAuth: () => ({ status: 'authenticated', user }) },
    '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/lib/api/http-client': { ApiError },
    '@/i18n': { useI18n: () => ({ locale: 'en' }), useTranslations: messages => (key, options) =>
      options?.amount ? messages.en[key].replace('{amount}', options.amount) : messages.en[key] },
    '@/theme': { layout, sizing: { controlComfortable: 48 }, spacing: { md: 16, xxxl: 64 }, radius: {}, shadows: {} },
    'services/water.repository': { waterRepository: repo },
    'components/water-icon': { Icon: 'Icon' },
    'components/intake-card': { IntakeCard: 'IntakeCard' },
    'components/water-date-time-field': { WaterDateTimeField: 'WaterDateTimeField' },
  };

  function load(name) {
    if (mocks[name]) return mocks[name];
    if (modules.has(name)) return modules.get(name);
    const extension = ['screens/', 'components/'].some(prefix => name.startsWith(prefix)) ? '.tsx' : '.ts';
    const source = readFileSync(path.join(sourceRoot, name + extension), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const exports = {};
    modules.set(name, exports);
    runInNewContext(outputText, { exports, require: specifier => {
      if (specifier.endsWith('.png')) return specifier;
      return load(specifier.startsWith('.') ? path.posix.join(path.posix.dirname(name), specifier) : specifier);
    }, Intl });
    return exports;
  }

  function mount(component) {
    const instance = { slot: 0, state: [] };
    return props => {
      instance.slot = 0;
      current = instance;
      return component(props);
    };
  }

  const { QuickAddCard } = load('components/quick-add-card');
  const { AmountTile } = load('components/amount-tile');
  const { ProgressCard } = load('components/progress-card');
  return {
    ApiError, requests, saves, setUser: id => { user = { id }; },
    useDaily: mount(load('hooks/use-water').useWaterDaily),
    screen: mount(load('screens/water-landing').default),
    detail: mount(load('screens/water-detail-entry').default), backCalls: () => backCalls,
    quick: mount(QuickAddCard), tile: mount(AmountTile), progress: mount(ProgressCard), QuickAddCard, AmountTile, ProgressCard,
  };
}

function find(element, predicate) {
  if (Array.isArray(element)) return element.map(child => find(child, predicate)).find(Boolean);
  if (element?.props) return predicate(element) ? element : find(element.props.children, predicate);
}

const summary = (totalMl, logs = []) => ({ totalMl, goalMl: 2000, percent: totalMl / 20, logs });
const byType = type => element => element.type === type;
const byRole = role => element => element.props.accessibilityRole === role;

async function landing() {
  const fixture = createFixture();
  fixture.screen();
  const previous = summary(1800, [{ id: 'previous' }]);
  fixture.requests[0].resolve(previous);
  await flush();
  return { ...fixture, previous };
}

test('one POST per pending submission, with a pie spinner and stable Quick Add through refresh', async () => {
  const f = await landing();
  const initial = f.screen();
  const quick = tree => find(tree, byType(f.QuickAddCard));
  const progress = tree => f.progress(find(tree, byType(f.ProgressCard)).props);
  const button = tree => find(f.quick(quick(tree).props), byRole('button')).props;
  find(f.quick(quick(initial).props), node => node.type === f.AmountTile && node.props.value === 500).props.onPress();
  const idleButton = button(initial);
  assert.match(idleButton.accessibilityLabel, /500/);

  const save = idleButton.onPress();
  await idleButton.onPress();
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].input.amountMl, 500);

  const pending = f.screen();
  const pendingButton = button(pending);
  assert.equal(pendingButton.disabled, true);
  assert.equal(pendingButton.children[1].props.children, idleButton.children[1].props.children);
  assert.equal(pendingButton.style({}).minHeight, idleButton.style({}).minHeight);
  const custom = find(f.quick(quick(pending).props), node => node.type === f.AmountTile && node.props.value === 'custom');
  assert.equal(f.tile(custom.props).props.disabled, true);
  assert.equal(find(progress(pending), byType('ActivityIndicator')).type, 'ActivityIndicator');

  f.saves[0].resolve({ id: 'added' });
  await save;
  const refreshing = f.screen();
  assert.equal(button(refreshing).disabled, true);
  assert.ok(find(progress(refreshing), byType('ActivityIndicator')));
  assert.equal(find(refreshing, byType(f.ProgressCard)).props.summary, f.previous);
  assert.equal(find(refreshing, byType('IntakeCard')).props.logs, f.previous.logs);

  const next = summary(2300, [{ id: 'added' }, ...f.previous.logs]);
  f.requests[1].resolve(next);
  await flush();
  const updated = f.screen();
  assert.equal(button(updated).disabled, false);
  assert.match(button(updated).accessibilityLabel, /500/);
  assert.equal(find(updated, byType(f.ProgressCard)).props.summary, next);
  assert.equal(find(updated, byType('IntakeCard')).props.logs, next.logs);
  assert.equal(find(progress(updated), byType('ActivityIndicator')), undefined);

  const initialChildren = initial.props.children.props.children;
  const quickIndex = initialChildren.indexOf(quick(initial));
  for (const tree of [pending, refreshing, updated]) {
    const quickElement = tree.props.children.props.children[quickIndex];
    assert.equal(quickElement.type, f.QuickAddCard);
    assert.equal(quickElement.key, quick(initial).key);
    assert.deepEqual(f.quick(quickElement.props).props.style, f.quick(quick(initial).props).props.style);
    assert.deepEqual(find(progress(tree), byRole('progressbar')).props.style, find(progress(initial), byRole('progressbar')).props.style);
    assert.deepEqual(find(progress(tree), byType('LinearGradient')).props.style, find(progress(initial), byType('LinearGradient')).props.style);
    const tile = find(f.quick(quickElement.props), node => node.type === f.AmountTile && node.props.value === 500);
    assert.equal(f.tile(tile.props).props.style({}).minHeight, 72);
  }

  const later = button(updated).onPress();
  assert.equal(f.saves.length, 2);
  f.saves[1].resolve({ id: 'later' });
  await later;
});

test('409 shows a localized conflict, retains selection and leaves progress and history unchanged', async () => {
  const f = await landing();
  const addButton = tree => find(f.quick(find(tree, byType(f.QuickAddCard)).props), byRole('button')).props;
  const card = find(f.screen(), byType(f.QuickAddCard));
  find(f.quick(card.props), node => node.type === f.AmountTile && node.props.value === 100).props.onPress();
  const save = addButton(f.screen()).onPress();
  f.saves[0].reject(new f.ApiError(409));
  await save;
  const failed = f.screen();
  assert.ok(find(failed, node => node.props.children === 'A water log already exists for this time.'));
  assert.equal(find(failed, byType(f.ProgressCard)).props.loading, false);
  assert.equal(find(failed, byType(f.ProgressCard)).props.summary, f.previous);
  assert.equal(find(failed, byType('IntakeCard')).props.logs, f.previous.logs);
  assert.equal(f.requests.length, 1);
  assert.equal(f.saves.length, 1);
  assert.match(addButton(failed).accessibilityLabel, /100/);
  assert.equal(addButton(failed).disabled, false);

  const retry = addButton(failed).onPress();
  assert.equal(f.saves.length, 2);
  f.saves[1].reject(new Error('offline'));
  await retry;
  assert.ok(find(f.screen(), node => node.props.children === 'Could not add water. Please try again.'));
});

test('after a successful POST and failed GET, retain the last summary and label it as stale', async () => {
  const f = await landing();
  const screen = f.screen();
  const save = find(screen, byType(f.QuickAddCard)).props.onAdd(250);
  f.saves[0].resolve({ id: 'added' });
  await save;
  assert.equal(find(f.screen(), byType(f.ProgressCard)).props.loading, true);
  f.requests[1].reject(new Error('offline'));
  await flush();

  const failed = f.screen();
  const progress = find(failed, byType(f.ProgressCard)).props;
  assert.equal(progress.loading, false);
  assert.equal(progress.summary, f.previous);
  assert.equal(find(failed, byType('IntakeCard')).props.logs, f.previous.logs);
  assert.equal(find(failed, byType(f.QuickAddCard)).props.disabled, false);
  assert.ok(find(failed, node => node.props.children === 'Could not refresh water intake. Showing the last loaded data.'));
});

test('new account and date never render the previous daily summary, including after a late response', async () => {
  const f = await landing();
  f.setUser('grace');
  assert.equal(find(f.screen(), byType(f.ProgressCard)).props.summary, null);
  assert.equal(find(f.screen(), byType('IntakeCard')), undefined);

  const date = '2026-11-20';
  f.useDaily(date, true, 'grace');
  const otherDay = f.useDaily('2026-11-21', true, 'grace');
  assert.equal(otherDay.summary, null);
  f.requests[2].resolve(summary(100));
  await flush();
  assert.equal(f.useDaily('2026-11-21', true, 'grace').summary, null);
  const next = summary(250);
  f.requests[3].resolve(next);
  await flush();
  assert.equal(f.useDaily('2026-11-21', true, 'grace').summary, next);
  assert.equal(f.useDaily(date, true, 'grace').summary, null);
});

test('custom save shares the pending guard with Quick Add and preserves its input after 409', async () => {
  const f = await landing();
  const saveLabel = 'Save water log';
  const saveButton = tree => find(tree, node => node.type === 'Pressable'
    && node.props.accessibilityLabel === saveLabel).props;
  find(f.detail(), byType('TextInput')).props.onChangeText('350');
  const save = saveButton(f.detail()).onPress();
  await saveButton(f.detail()).onPress();
  await find(f.screen(), byType(f.QuickAddCard)).props.onAdd(500);
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].input.amountMl, 350);
  assert.equal(saveButton(f.detail()).disabled, true);
  assert.equal(find(f.screen(), byType(f.QuickAddCard)).props.disabled, true);

  f.saves[0].reject(new f.ApiError(409));
  await save;
  const failed = f.detail();
  assert.equal(f.backCalls(), 0);
  assert.equal(find(failed, byType('TextInput')).props.value, '350');
  assert.equal(saveButton(failed).disabled, false);
  assert.ok(find(failed, node => node.props.children === 'A water log already exists for this time.'));

  const next = saveButton(failed).onPress();
  f.saves[1].resolve({ id: 'custom' });
  await next;
  assert.equal(f.backCalls(), 1);
});
