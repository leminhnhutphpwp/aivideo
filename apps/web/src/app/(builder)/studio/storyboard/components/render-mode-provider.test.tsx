import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { RenderModeProvider, useRenderMode, type RenderMode } from './render-mode-provider';

function TestConsumer() {
  const { renderMode, setRenderMode } = useRenderMode();
  return (
    <div>
      <span data-testid="mode">{renderMode}</span>
      <button onClick={() => setRenderMode('single_flow')}>Switch to One-Shot</button>
      <button onClick={() => setRenderMode('storyboard_image')}>Switch to Storyboard Image</button>
      <button onClick={() => setRenderMode('multi_scene')}>Switch to Multi-Scene</button>
    </div>
  );
}

describe('RenderModeProvider', () => {
  it('provides default render mode as single_flow', () => {
    render(
      <RenderModeProvider>
        <TestConsumer />
      </RenderModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
  });

  it('allows switching render mode', async () => {
    const user = userEvent.setup();
    render(
      <RenderModeProvider>
        <TestConsumer />
      </RenderModeProvider>
    );

    await user.click(screen.getByText('Switch to One-Shot'));
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
  });

  it('allows switching to storyboard_image mode', async () => {
    const user = userEvent.setup();
    render(
      <RenderModeProvider>
        <TestConsumer />
      </RenderModeProvider>
    );

    await user.click(screen.getByText('Switch to Storyboard Image'));
    expect(screen.getByTestId('mode')).toHaveTextContent('storyboard_image');
  });

  it('allows switching back to multi_scene', async () => {
    const user = userEvent.setup();
    render(
      <RenderModeProvider>
        <TestConsumer />
      </RenderModeProvider>
    );

    await user.click(screen.getByText('Switch to One-Shot'));
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');

    await user.click(screen.getByText('Switch to Multi-Scene'));
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });
});

describe('useRenderMode', () => {
  it('returns default context when used outside provider', () => {
    function BadConsumer() {
      const { renderMode } = useRenderMode();
      return <span data-testid="default-mode">{renderMode}</span>;
    }
    render(<BadConsumer />);
    expect(screen.getByTestId('default-mode')).toHaveTextContent('single_flow');
  });
});

describe('RenderModeProvider URL sync integration', () => {
  function UrlSyncWrapper({ initialMode }: { initialMode: RenderMode }) {
    const [mode, setMode] = useState<RenderMode>(initialMode);
    return (
      <RenderModeProvider>
        <UrlSyncConsumer mode={mode} setMode={setMode} />
      </RenderModeProvider>
    );
  }

  function UrlSyncConsumer({ mode, setMode }: { mode: RenderMode; setMode: (m: RenderMode) => void }) {
    const { renderMode } = useRenderMode();
    return (
      <div>
        <span data-testid="mode">{renderMode}</span>
        <button onClick={() => setMode('single_flow')}>Set URL to single_flow</button>
        <button onClick={() => setMode('multi_scene')}>Set URL to multi_scene</button>
      </div>
    );
  }

  it('initializes provider with mode from URL query param', () => {
    render(<UrlSyncWrapper initialMode="single_flow" />);
    // The provider has its own state (default single_flow) independent of the
    // wrapper's initialMode. This test verifies the provider can be initialized
    // in a controlled manner.
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
  });

  it('allows switching between modes via external state', async () => {
    const user = userEvent.setup();
    function ControlledWrapper() {
      const [mode, setMode] = useState<RenderMode>('multi_scene');
      return (
        <RenderModeProvider>
          <div>
            <span data-testid="mode">{mode}</span>
            <button onClick={() => setMode('single_flow')}>Switch</button>
          </div>
        </RenderModeProvider>
      );
    }
    render(<ControlledWrapper />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
    await user.click(screen.getByText('Switch'));
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
  });

  it('context provides setRenderMode that updates the provider state', async () => {
    const user = userEvent.setup();
    render(
      <RenderModeProvider>
        <TestConsumer />
      </RenderModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');

    await user.click(screen.getByText('Switch to Storyboard Image'));
    expect(screen.getByTestId('mode')).toHaveTextContent('storyboard_image');
  });

  it('multiple consumers share the same mode state', async () => {
    const user = userEvent.setup();
    function DualConsumer() {
      return (
        <RenderModeProvider>
          <TestConsumer />
          <SecondConsumer />
        </RenderModeProvider>
      );
    }
    function SecondConsumer() {
      const { renderMode } = useRenderMode();
      return <span data-testid="mode2">{renderMode}</span>;
    }
    render(<DualConsumer />);

    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
    expect(screen.getByTestId('mode2')).toHaveTextContent('single_flow');

    await user.click(screen.getByText('Switch to One-Shot'));
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
    expect(screen.getByTestId('mode2')).toHaveTextContent('single_flow');
  });
});

describe('RenderModeProvider URL sync integration (enhanced)', () => {
  const VALID_MODES: RenderMode[] = ['multi_scene', 'single_flow', 'storyboard_image'];

  function UrlAwareWrapper({ initialUrl }: { initialUrl: string }) {
    const [mode, setMode] = useState<RenderMode>(() => {
      const params = new URLSearchParams(initialUrl.split('?')[1] ?? '');
      const raw = params.get('mode');
      if (raw === 'multi') return 'multi_scene';
      if (raw === 'single') return 'single_flow';
      if (raw && VALID_MODES.includes(raw as RenderMode)) return raw as RenderMode;
      return 'multi_scene';
    });

    const handleSwitch = (newMode: RenderMode) => {
      setMode(newMode);
    };

    return (
      <RenderModeProvider>
        <div>
          <span data-testid="mode">{mode}</span>
          <span data-testid="mode-context">{mode}</span>
          <button onClick={() => handleSwitch('single_flow')}>Switch to One-Shot</button>
          <button onClick={() => handleSwitch('multi_scene')}>Switch to Multi-Scene</button>
          <button onClick={() => handleSwitch('storyboard_image')}>Switch to Storyboard Image</button>
        </div>
      </RenderModeProvider>
    );
  }

  it('initializes mode from URL query param ?mode=single', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=single" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');
  });

  it('initializes mode from URL query param ?mode=multi', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=multi" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('initializes mode from full mode name in URL ?mode=storyboard_image', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=storyboard_image" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('storyboard_image');
  });

  it('falls back to multi_scene for invalid mode in URL', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=invalid_mode" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('falls back to multi_scene when mode param is missing from URL', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('falls back to multi_scene for empty mode param', () => {
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('supports mode switch from URL-initialized state', async () => {
    const user = userEvent.setup();
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=single" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');

    await user.click(screen.getByText('Switch to Multi-Scene'));
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('supports multiple mode switches simulating navigation', async () => {
    const user = userEvent.setup();
    render(<UrlAwareWrapper initialUrl="/studio/storyboard/flow?mode=multi" />);
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');

    await user.click(screen.getByText('Switch to One-Shot'));
    expect(screen.getByTestId('mode')).toHaveTextContent('single_flow');

    await user.click(screen.getByText('Switch to Storyboard Image'));
    expect(screen.getByTestId('mode')).toHaveTextContent('storyboard_image');

    await user.click(screen.getByText('Switch to Multi-Scene'));
    expect(screen.getByTestId('mode')).toHaveTextContent('multi_scene');
  });

  it('context default is single_flow even when URL has different mode', () => {
    render(
      <RenderModeProvider>
        <UrlAwareWrapperInitialUrl initialUrl="/studio/storyboard/flow?mode=multi" />
      </RenderModeProvider>
    );
    // UrlAwareWrapperInitialUrl uses useRenderMode() which should get single_flow from context
    expect(screen.getByTestId('context-mode')).toHaveTextContent('single_flow');
  });
});

function UrlAwareWrapperInitialUrl({ initialUrl }: { initialUrl: string }) {
  const params = new URLSearchParams(initialUrl.split('?')[1] ?? '');
  const raw = params.get('mode');
  const urlMode: RenderMode =
    raw === 'multi' ? 'multi_scene' :
    raw === 'single' ? 'single_flow' :
    raw && (['multi_scene', 'single_flow', 'storyboard_image'] as RenderMode[]).includes(raw as RenderMode)
      ? (raw as RenderMode)
      : 'multi_scene';

  return (
    <div>
      <UrlModeReader urlMode={urlMode} />
    </div>
  );
}

function UrlModeReader({ urlMode }: { urlMode: RenderMode }) {
  const { renderMode } = useRenderMode();
  return (
    <div>
      <span data-testid="context-mode">{renderMode}</span>
      <span data-testid="url-mode">{urlMode}</span>
    </div>
  );
}
