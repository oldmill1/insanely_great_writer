module WindowShellHelper
  WINDOW_SHELL_DEFAULT_LAYOUT = {
    x: 280,
    y: 120,
    width: 380,
    height: 240
  }.freeze

  WINDOW_TYPE_CONFIG = {
    "document" => {
      width: 760,
      height: 520,
      controls: [ "close", nil, "open-document" ].freeze,
      loading_text: "Loading document..."
    },
    "folder" => {
      width: 680,
      height: 440,
      controls: [ "close", nil, nil ].freeze,
      loading_text: "Loading folder..."
    }
  }.freeze

  def document_window_shell_options(document_id:, title:, window_key: nil, content_frame_id: nil, content_src: nil, dataset: {}, **layout)
    document_id = document_id.to_s
    frame_id = content_frame_id.presence || "document_window_#{document_id}_content"
    frame_src = content_src.presence || doc_path(document_id, terminal_frame_id: frame_id)

    build_window_shell_options(
      window_kind: "document",
      window_item_id: document_id,
      window_key: window_key.presence || "document_window_#{document_id}",
      title: title,
      content_frame_id: frame_id,
      content_src: frame_src,
      controls: WINDOW_TYPE_CONFIG.fetch("document")[:controls],
      dataset: { document_path: doc_path(document_id) }.merge(dataset),
      **layout.merge(defaults: WINDOW_TYPE_CONFIG.fetch("document"))
    )
  end

  def folder_window_shell_options(title:, folder_id: nil, window_key: nil, content_frame_id: nil, content_src: nil, dataset: {}, **layout)
    normalized_folder_id = folder_id.presence&.to_s
    frame_id = content_frame_id.presence || (normalized_folder_id ? "folder_window_#{normalized_folder_id}_content" : "folder_window_root_content")
    frame_src = content_src.presence || (
      if normalized_folder_id
        folder_path(normalized_folder_id, frame_id: frame_id)
      else
        root_folders_path(frame_id: frame_id)
      end
    )

    build_window_shell_options(
      window_kind: "folder",
      window_item_id: normalized_folder_id,
      window_key: window_key.presence || (normalized_folder_id ? "folder_window_#{normalized_folder_id}" : "folder_window_root"),
      title: title,
      content_frame_id: frame_id,
      content_src: frame_src,
      controls: WINDOW_TYPE_CONFIG.fetch("folder")[:controls],
      dataset: dataset,
      **layout.merge(defaults: WINDOW_TYPE_CONFIG.fetch("folder"))
    )
  end

  private

  def build_window_shell_options(window_kind:, window_item_id:, window_key:, title:, content_frame_id:, content_src:, controls:, dataset:, defaults:, **layout)
    {
      window_key: window_key,
      window_kind: window_kind,
      window_item_id: window_item_id.to_s,
      title: title,
      content_frame_id: content_frame_id,
      content_src: content_src,
      controls: Array(controls).first(3),
      dataset: dataset.compact,
      x: layout.fetch(:x, WINDOW_SHELL_DEFAULT_LAYOUT[:x]),
      y: layout.fetch(:y, WINDOW_SHELL_DEFAULT_LAYOUT[:y]),
      width: layout.fetch(:width, defaults[:width] || WINDOW_SHELL_DEFAULT_LAYOUT[:width]),
      height: layout.fetch(:height, defaults[:height] || WINDOW_SHELL_DEFAULT_LAYOUT[:height]),
      centered: layout[:centered],
      content: layout[:content],
      class_name: layout[:class_name]
    }
  end
end
