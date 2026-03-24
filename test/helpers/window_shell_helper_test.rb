require "test_helper"

class WindowShellHelperTest < ActionView::TestCase
  test "document window shell options follow the canonical contract" do
    document = documents(:one)

    options = document_window_shell_options(document_id: document.id, title: document.title)

    assert_equal "document", options[:window_kind]
    assert_equal document.id.to_s, options[:window_item_id]
    assert_equal "document_window_#{document.id}", options[:window_key]
    assert_equal "document_window_#{document.id}_content", options[:content_frame_id]
    assert_equal "/docs/#{document.id}", options[:dataset][:document_path]
    assert_equal [ "close", nil, "open-document" ], options[:controls]
    assert_equal 760, options[:width]
    assert_equal 520, options[:height]
  end

  test "folder window shell options support the root folder contract" do
    options = folder_window_shell_options(title: "Root")

    assert_equal "folder", options[:window_kind]
    assert_equal "", options[:window_item_id]
    assert_equal "folder_window_root", options[:window_key]
    assert_equal "folder_window_root_content", options[:content_frame_id]
    assert_equal "/folders/root?frame_id=folder_window_root_content", options[:content_src]
    assert_equal [ "close", nil, nil ], options[:controls]
    assert_equal 680, options[:width]
    assert_equal 440, options[:height]
  end

  test "window shell partial renders canonical data attributes and frame wiring" do
    render partial: "shared/window_shell", locals: {
      window_key: "document_window_42",
      window_kind: "document",
      window_item_id: "42",
      title: "Opening",
      content_frame_id: "document_window_42_content",
      content_src: "/docs/42?terminal_frame_id=document_window_42_content",
      controls: [ "close", nil, "open-document" ],
      dataset: { document_path: "/docs/42" },
      width: 760,
      height: 520
    }

    assert_includes rendered, 'data-desktop-window-key="document_window_42"'
    assert_includes rendered, 'data-window-kind="document"'
    assert_includes rendered, 'data-window-item-id="42"'
    assert_includes rendered, 'data-window-title="Opening"'
    assert_includes rendered, 'data-document-path="/docs/42"'
    assert_includes rendered, 'data-window-control="close"'
    assert_includes rendered, 'data-window-control="open-document"'
    assert_match(/<turbo-frame[^>]*id="document_window_42_content"/, rendered)
    assert_includes rendered, 'src="/docs/42?terminal_frame_id=document_window_42_content"'
  end
end
