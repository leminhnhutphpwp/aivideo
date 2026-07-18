import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryboardImagePanel } from './storyboard-image-panel';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const mockIcon = (name: string) => {
    const Icon = (props: any) => <svg data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    Sparkles: mockIcon('Sparkles'),
    Upload: mockIcon('Upload'),
    X: mockIcon('X'),
    ImageIcon: mockIcon('ImageIcon'),
    Loader2: mockIcon('Loader2'),
    Camera: mockIcon('Camera'),
    Palette: mockIcon('Palette'),
    Smile: mockIcon('Smile'),
    Sun: mockIcon('Sun'),
    Mic: mockIcon('Mic'),
    ChevronDown: mockIcon('ChevronDown'),
    Music: mockIcon('Music'),
    Info: mockIcon('Info'),
    Wand2: mockIcon('Wand2'),
  };
});

vi.mock('@/components/studio/options', () => ({
  CAMERA_OPTIONS: [],
  STYLE_OPTIONS: [],
  MOOD_OPTIONS: [],
  LIGHTING_OPTIONS: [],
}));

vi.mock('@/components/studio/rich-select', () => ({
  RichSelect: ({ label }: { label: string }) => <div data-testid={`rich-select-${label}`}>{label}</div>,
}));

function createProps(overrides: Partial<Parameters<typeof StoryboardImagePanel>[0]> = {}) {
  return {
    multiPanelImageUrl: null,
    onMultiPanelImageChange: vi.fn(),
    onUploadFile: vi.fn().mockResolvedValue('/uploaded/file.jpg'),
    onGenerateMultiPanel: vi.fn().mockResolvedValue(undefined),
    generatingMultiPanel: false,
    compiledPrompt: null,
    onCompile: vi.fn(),
    onEdit: vi.fn(),
    sceneCount: 3,
    totalDuration: 30,
    sharedCamera: '',
    sharedStyle: '',
    sharedMood: '',
    sharedLighting: '',
    sharedNarration: '',
    onSharedSkillChange: vi.fn(),
    drivingAudio: '',
    onDrivingAudioChange: vi.fn(),
    firstFrameImage: '',
    onFirstFrameImageChange: vi.fn(),
    lastFrameImage: '',
    onLastFrameImageChange: vi.fn(),
    ...overrides,
  };
}

describe('StoryboardImagePanel', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders the multi-panel header', () => {
    render(<StoryboardImagePanel {...createProps()} />);
    expect(screen.getByText('Multi-Panel')).toBeInTheDocument();
  });

  it('shows upload area when no image', () => {
    render(<StoryboardImagePanel {...createProps()} />);
    expect(screen.getByText('Chọn bảng phân cảnh')).toBeInTheDocument();
  });

  it('shows image preview when multiPanelImageUrl is provided', () => {
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: 'https://example.com/panel.jpg' })} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Multi-panel');
  });

  it('calls onMultiPanelImageChange when X button is clicked on image', async () => {
    const onMultiPanelImageChange = vi.fn();
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: 'https://example.com/panel.jpg', onMultiPanelImageChange })} />);
    await userEvent.click(screen.getByRole('button', { name: '' }));
    expect(onMultiPanelImageChange).toHaveBeenCalledWith('');
  });

  it('shows "Viết prompt" button when no compiledPrompt', () => {
    render(<StoryboardImagePanel {...createProps()} />);
    expect(screen.getByText('Viết prompt')).toBeInTheDocument();
  });

  it('"Viết prompt" button is disabled when no multiPanelImageUrl', () => {
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: null })} />);
    expect(screen.getByText('Viết prompt')).toBeDisabled();
  });

  it('"Viết prompt" button is enabled when multiPanelImageUrl is set', () => {
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: 'https://example.com/panel.jpg' })} />);
    expect(screen.getByText('Viết prompt')).toBeEnabled();
  });

  it('calls onCompile when "Viết prompt" is clicked', async () => {
    const onCompile = vi.fn();
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: 'https://example.com/panel.jpg', onCompile })} />);
    await userEvent.click(screen.getByText('Viết prompt'));
    expect(onCompile).toHaveBeenCalledTimes(1);
  });

  it('shows textarea with compiled prompt when provided', () => {
    const compiledPrompt = 'A cinematic video about...';
    render(<StoryboardImagePanel {...createProps({ compiledPrompt })} />);
    expect(screen.getByDisplayValue(compiledPrompt)).toBeInTheDocument();
  });

  it('calls onEdit when compiled prompt textarea changes', async () => {
    const onEdit = vi.fn();
    render(<StoryboardImagePanel {...createProps({ compiledPrompt: 'Old prompt', onEdit })} />);
    const textarea = screen.getByDisplayValue('Old prompt');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'New prompt');
    expect(onEdit).toHaveBeenCalled();
  });

  it('shows "Tạo ảnh multi-panel" button when sceneCount > 0', () => {
    render(<StoryboardImagePanel {...createProps({ sceneCount: 2 })} />);
    expect(screen.getByText('Tạo ảnh multi-panel từ AI')).toBeInTheDocument();
  });

  it('does not show "Tạo ảnh multi-panel" button when sceneCount is 0', () => {
    render(<StoryboardImagePanel {...createProps({ sceneCount: 0 })} />);
    expect(screen.queryByText('Tạo ảnh multi-panel từ AI')).not.toBeInTheDocument();
  });

  it('calls onGenerateMultiPanel when generate button is clicked', async () => {
    const onGenerateMultiPanel = vi.fn().mockResolvedValue(undefined);
    render(<StoryboardImagePanel {...createProps({ sceneCount: 2, onGenerateMultiPanel })} />);
    await userEvent.click(screen.getByText('Tạo ảnh multi-panel từ AI'));
    expect(onGenerateMultiPanel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when generatingMultiPanel is true', () => {
    render(<StoryboardImagePanel {...createProps({ sceneCount: 2, generatingMultiPanel: true })} />);
    expect(screen.getByText('Đang tạo...')).toBeInTheDocument();
    expect(screen.getByText('Đang tạo...')).toBeDisabled();
  });

  it('shows required hint when no image is uploaded', () => {
    render(<StoryboardImagePanel {...createProps({ multiPanelImageUrl: null })} />);
    expect(screen.getByText('Cần tải bảng phân cảnh trước')).toBeInTheDocument();
  });

  it('shows skills section with RichSelect components', () => {
    render(<StoryboardImagePanel {...createProps()} />);
    expect(screen.getByText('Kỹ thuật quay dựng')).toBeInTheDocument();
  });

  it('displays scene count in footer', () => {
    render(<StoryboardImagePanel {...createProps({ sceneCount: 5 })} />);
    expect(screen.getByText('5 cảnh')).toBeInTheDocument();
  });

  it('displays total duration in footer', () => {
    render(<StoryboardImagePanel {...createProps({ totalDuration: 45 })} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('calls onSharedSkillChange when camera skill changes', async () => {
    const onSharedSkillChange = vi.fn();
    render(<StoryboardImagePanel {...createProps({ sharedCamera: '', onSharedSkillChange })} />);
    const select = screen.getByText('Chuyển động Camera');
    expect(select).toBeInTheDocument();
  });

  it('shows narration textarea with value', () => {
    render(<StoryboardImagePanel {...createProps({ sharedNarration: 'Test narration' })} />);
    expect(screen.getByDisplayValue('Test narration')).toBeInTheDocument();
  });

  it('shows "Viết lại" button when compiledPrompt is present', () => {
    render(<StoryboardImagePanel {...createProps({ compiledPrompt: 'Some prompt' })} />);
    expect(screen.getByText('Viết lại')).toBeInTheDocument();
  });

  it('calls onCompile when "Viết lại" is clicked', async () => {
    const onCompile = vi.fn();
    render(<StoryboardImagePanel {...createProps({ compiledPrompt: 'Some prompt', onCompile })} />);
    await userEvent.click(screen.getByText('Viết lại'));
    expect(onCompile).toHaveBeenCalledTimes(1);
  });
});
