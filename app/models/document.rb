class Document < ApplicationRecord
  DOC_SHORTCUT_THUMBNAIL = "/icons/write.png".freeze
  FALLBACK_TITLE = "Untitled Document".freeze
  EMPTY_CONTENT_AST = {
    "type" => "doc",
    "version" => 1,
    "children" => [
      { "type" => "paragraph", "children" => [] }
    ]
  }.freeze

  belongs_to :user
  has_one :shortcut, dependent: :destroy
  scope :active, -> { where(is_deleted: false) }

  before_validation :normalize_editor_content!
  after_commit :ensure_desktop_shortcut!, on: :create
  after_commit :sync_desktop_shortcut_label!, on: :update, if: :saved_change_to_title?

  def desktop_shortcut_label
    title.presence || FALLBACK_TITLE
  end

  def create_desktop_shortcut!
    return shortcut if shortcut.present?

    create_shortcut!(
      label: desktop_shortcut_label,
      thumbnail: DOC_SHORTCUT_THUMBNAIL,
      **Shortcut.next_grid_position
    )
  end

  def content_ast_hash
    value = content_ast.is_a?(Hash) ? content_ast : {}
    normalized = normalize_content_ast(value)
    normalized.presence || plain_text_to_ast(content.to_s)
  end

  def editor_html
    blocks = content_ast_hash.fetch("children", [])
    return "<p><br></p>" if blocks.blank?

    blocks.filter_map do |block|
      next unless block.is_a?(Hash) && block["type"] == "paragraph"

      nodes = Array(block["children"])
      inner_html = nodes.map do |node|
        next "" unless node.is_a?(Hash)

        case node["type"]
        when "text"
          ERB::Util.html_escape(node["text"].to_s)
        when "hard_break"
          "<br>"
        else
          ""
        end
      end.join

      "<p>#{inner_html.presence || '<br>'}</p>"
    end.join.presence || "<p><br></p>"
  end

  private

  def normalize_editor_content!
    ast = normalize_content_ast(content_ast)
    ast = plain_text_to_ast(content.to_s) if ast.blank?
    ast = EMPTY_CONTENT_AST.deep_dup if ast.blank?

    self.content_ast = ast
    self.content = ast_to_plain_text(ast)
  end

  def normalize_content_ast(value)
    return if value.blank?
    return unless value.is_a?(Hash) && value["type"] == "doc"

    blocks = Array(value["children"]).filter_map do |block|
      next unless block.is_a?(Hash) && block["type"] == "paragraph"

      nodes = Array(block["children"]).filter_map do |node|
        next unless node.is_a?(Hash)

        case node["type"]
        when "text"
          { "type" => "text", "text" => node["text"].to_s }
        when "hard_break"
          { "type" => "hard_break" }
        end
      end

      { "type" => "paragraph", "children" => nodes }
    end

    {
      "type" => "doc",
      "version" => 1,
      "children" => blocks.presence || [ { "type" => "paragraph", "children" => [] } ]
    }
  end

  def plain_text_to_ast(text)
    lines = text.to_s.split("\n", -1)

    {
      "type" => "doc",
      "version" => 1,
      "children" => lines.map do |line|
        paragraph = { "type" => "paragraph", "children" => [] }
        paragraph["children"] << { "type" => "text", "text" => line } if line.present?
        paragraph
      end.presence || [ { "type" => "paragraph", "children" => [] } ]
    }
  end

  def ast_to_plain_text(ast)
    blocks = Array(ast["children"])

    blocks.map do |block|
      next "" unless block.is_a?(Hash) && block["type"] == "paragraph"

      Array(block["children"]).map do |node|
        next "" unless node.is_a?(Hash)

        case node["type"]
        when "text"
          node["text"].to_s
        when "hard_break"
          "\n"
        else
          ""
        end
      end.join
    end.join("\n")
  end

  def ensure_desktop_shortcut!
    create_desktop_shortcut!
  end

  def sync_desktop_shortcut_label!
    return if shortcut.blank?

    shortcut.update!(label: desktop_shortcut_label)
  end
end
