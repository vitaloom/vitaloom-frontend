const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const text = 'Ghi giúp mình 250 ml nước';
const row = { id: 'conversation', turns: [] };
const element = (type, props) => ({ type, props });
const flush = () => new Promise(resolve => setImmediate(resolve));

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function mount(file, initialState, api, push = () => {}) {
  const state = [...initialState];
  const refs = [];
  let index = 0;
  let refIndex = 0;
  let turn = 0;
  const mocks = {
    react: { useCallback: fn => fn, useEffect: () => {}, useRef: current => refs[refIndex++] ??= { current },
      useState: value => {
        const slot = index++;
        if (!(slot in state)) state[slot] = value;
        return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
      } },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'expo-router': { Stack: { Screen: 'Screen' }, router: { push } },
    'react-native': { Button: 'Button', Platform: { OS: 'web' }, Pressable: 'Pressable', TextInput: 'TextInput' },
    'react-native-safe-area-context': {},
    '@/components/themed-text': {},
    '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/i18n': { useTranslations: () => key => key, useI18n: () => ({ locale: 'vi' }) },
    '@/lib/api/http-client': { ApiError, getApiSessionGeneration: () => 1 },
    '@/theme': { layout: {}, radius: {}, sizing: {}, spacing: {} },
    './assistant-access-provider': { useAssistantAccess: () => ({ refresh() {} }) },
    './assistant-api': { createTurnId: () => `turn-${++turn}` },
    './assistant-course-api': { courseApi: () => api },
    './assistant-voice-files': { removeVoiceFile() {} },
    './course-messages': {},
    './assistant-voice-input': {},
  };
  const source = readFileSync(join(__dirname, '../src/features/assistant', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: name => mocks[name], AbortController, process });
  return (name, arg) => {
    index = refIndex = 0;
    return exports[name](arg);
  };
}

function find(node, match) {
  if (Array.isArray(node)) return node.map(child => find(child, match)).find(Boolean);
  if (node?.props) return match(node) ? node : find(node.props.children, match);
}

test('bottom-sheet composer clears before the request finishes and retries with the same turn', async () => {
  const calls = [];
  let reject;
  const render = mount('use-assistant-conversation.ts', [[], text], {
    create: async () => row,
    send: (...args) => {
      calls.push(args);
      return calls.length === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve(row);
    },
  });
  const hook = () => render('useAssistantConversation', true);
  const sending = hook().sendText();
  assert.equal(hook().text, '');
  assert.equal(hook().messages[0].text, text);
  await flush();
  reject(new Error('offline'));
  await sending;
  assert.equal(hook().error, 'requestError');
  await hook().retrySend();
  assert.deepEqual(calls, [[row.id, text, 'turn-1'], [row.id, text, 'turn-1']]);
});

test('full chat clears before the response and offers retry with an empty composer', async () => {
  const calls = [];
  let reject;
  const render = mount('assistant-course-screen.tsx', [[], 0, false, row, text], {
    send: (...args) => {
      calls.push(args);
      return calls.length === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve(row);
    },
  });
  const screen = () => render('default', {});
  const button = title => find(screen(), node => node.type === 'Button' && node.props.title === title).props;
  const input = () => find(screen(), node => node.type === 'TextInput').props;
  button('send').onPress();
  assert.equal(input().value, '');
  reject(new Error('offline'));
  await flush();
  assert.equal(button('retry').disabled, false);
  button('retry').onPress();
  await flush();
  assert.deepEqual(calls, [[row.id, text, 'turn-1'], [row.id, text, 'turn-1']]);
});

test('bottom sheet warns the user to check their journal and retries the original uncertain turn', async () => {
  const calls = [];
  const render = mount('use-assistant-conversation.ts', [[], text], {
    create: async () => row,
    send: async (...args) => {
      calls.push(args);
      if (calls.length === 1) throw new ApiError(503, 'ASSISTANT_WRITE_UNCERTAIN');
      return row;
    },
  });
  const hook = () => render('useAssistantConversation', true);
  await hook().sendText();
  assert.equal(hook().error, 'writeUncertain');
  await hook().retrySend();
  assert.deepEqual(calls, [[row.id, text, 'turn-1'], [row.id, text, 'turn-1']]);
});

test('full chat shows the journal warning for an uncertain write', async () => {
  const render = mount('assistant-course-screen.tsx', [[], 0, false, row, text], {
    send: async () => { throw new ApiError(503, 'ASSISTANT_WRITE_UNCERTAIN'); },
  });
  find(render('default', {}), node => node.type === 'Button' && node.props.title === 'send').props.onPress();
  await flush();
  assert.ok(find(render('default', {}), node => node.props.children === 'writeUncertain'));
});

test('native and historical turns render in both surfaces and the course links secondary sources', async () => {
  const replies = ['Chào bạn!', 'Bạn đã ngủ bao lâu?', 'Đã ghi 390 phút ngủ.',
    'Hãy kiểm tra nhật ký trước khi gửi yêu cầu mới.', 'Bạn muốn ngày nào?'];
  const secondary = { status: 'ANSWERED', text: '', source: {
    id: 'sleep-recent', title: 'Giấc ngủ gần đây', version: 1, route: '/sleep/recent', from: '2026-11-14',
  } };
  const result = { id: row.id, turns: replies.map((text, index) => {
    const status = index === 3 ? 'DEPENDENCY_UNAVAILABLE' : 'ANSWERED';
    return {
      turnId: `native-${index}`, text: `Lượt ${index + 1}`,
      outcome: index === 4 ? 'WRITE_CLARIFICATION' : status,
      parts: index === 0 ? [{ status, text }, secondary] : [{ status, text }],
    };
  }) };
  const renderSheet = mount('use-assistant-conversation.ts', [[], text], {
    create: async () => row, send: async () => result,
  });
  const hook = () => renderSheet('useAssistantConversation', true);
  await hook().sendText();
  assert.deepEqual(Array.from(hook().messages.filter(message => message.role === 'assistant'), message => message.text),
    replies);

  const routes = [];
  const renderCourse = mount('assistant-course-screen.tsx', [[], 0, false, result, ''], {}, route => routes.push(route));
  const course = renderCourse('default', {});
  for (const reply of replies) assert.ok(find(course, node => node.props.children === reply), reply);
  const link = find(course, node => node.props.accessibilityRole === 'link');
  assert.ok(find(link, node => Array.isArray(node.props.children) && node.props.children.includes(secondary.source.title)));
  link.props.onPress();
  assert.deepEqual(routes, ['/sleep/recent']);
});
