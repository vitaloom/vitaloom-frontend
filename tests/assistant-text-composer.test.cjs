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

function mount(file, initialState, api) {
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
    'expo-router': { Stack: { Screen: 'Screen' } },
    'react-native': { Button: 'Button', Platform: { OS: 'web' }, TextInput: 'TextInput' },
    'react-native-safe-area-context': {},
    '@/components/themed-text': {},
    '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/i18n': { useTranslations: () => key => key, useI18n: () => ({ locale: 'vi' }) },
    '@/lib/api/http-client': { ApiError: class extends Error {}, getApiSessionGeneration: () => 1 },
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
