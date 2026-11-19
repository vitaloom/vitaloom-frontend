const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/features/assistant/assistant-voice-input.tsx'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

function mount({ prepare = async () => {} } = {}) {
  const events = [];
  let timeout;
  const output = { exports: {} };
  const element = (type, props) => ({ type, props });
  const mocks = {
    'expo-audio': {
      AudioModule: { getRecordingPermissionsAsync: async () => ({ granted: true }) },
      RecordingPresets: { HIGH_QUALITY: {} },
      setAudioModeAsync: async () => {},
      useAudioRecorder: () => ({ uri: 'test-audio', prepareToRecordAsync: prepare,
        record: () => events.push('record'), stop: async () => { events.push('stop'); } }),
    },
    'expo-file-system': { File: class { exists = true; size = 100; } },
    react: { useCallback: fn => fn, useEffect: fn => fn(), useRef: current => ({ current }),
      useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
      Pressable: 'Pressable', View: 'View' },
    '@/components/themed-text': { ThemedText: 'Text' },
    '@/i18n': { useTranslations: () => key => key },
    '@/lib/api/http-client': { getApiSessionGeneration: () => 1 },
    '@/theme': { radius: { full: 99 }, sizing: { controlComfortable: 48 }, spacing: { sm: 8 } },
    './assistant-ui-messages': {},
    './course-messages': {},
    './assistant-voice-consent': { hasAssistantVoiceConsent: () => true },
    './assistant-voice-files': { removeVoiceFile: () => events.push('remove') },
    './vita-ai-avatar': { VitaAiAvatar: 'VitaAiAvatar' },
  };
  runInNewContext(outputText, { exports: output.exports, require: name => mocks[name],
    setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => { timeout = undefined; } });
  const control = output.exports.AssistantVoiceInput({ disabled: false, holdToRecord: true,
    onStart: () => true, onReady: () => events.push('send'), onFailure: () => events.push('error'),
    onCancel: () => events.push('cancel') });
  return { control, events, expire: () => timeout() };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('the mic uses the recording asset and sends once when the held touch releases', async () => {
  const { control, events } = mount();
  assert.equal(control.props.children.props.variant, 'recording');
  assert.equal(control.props.onStartShouldSetResponder(), true);
  control.props.onResponderGrant();
  await flush();
  assert.deepEqual(events, ['record']);
  control.props.onResponderRelease();
  control.props.onResponderRelease();
  await flush();
  assert.deepEqual(events, ['record', 'stop', 'send']);
});

test('releasing while native preparation is pending cancels without sending', async () => {
  let prepared;
  const { control, events } = mount({ prepare: () => new Promise(resolve => { prepared = resolve; }) });
  control.props.onResponderGrant();
  await flush();
  control.props.onResponderRelease();
  prepared();
  await flush();
  assert.deepEqual(events, ['cancel', 'stop', 'remove']);
});

test('the recording cap stops capture and waits for release before sending', async () => {
  const { control, events, expire } = mount();
  control.props.onResponderGrant();
  await flush();
  expire();
  await flush();
  assert.deepEqual(events, ['record', 'stop']);
  control.props.onResponderRelease();
  await flush();
  assert.deepEqual(events, ['record', 'stop', 'send']);
});

test('responder termination discards instead of submitting', async () => {
  const { control, events } = mount();
  control.props.onResponderGrant();
  await flush();
  control.props.onResponderTerminate();
  control.props.onResponderRelease();
  await flush();
  assert.deepEqual(events, ['record', 'stop', 'cancel', 'remove']);
});
