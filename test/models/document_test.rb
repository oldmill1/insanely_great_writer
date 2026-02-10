require "test_helper"

class DocumentTest < ActiveSupport::TestCase
  test "creates a desktop shortcut when document is created" do
    document = nil
    user = users(:one)

    assert_difference("Shortcut.count", 1) do
      document = Document.create!(user: user, title: "Act I", content: "Opening")
    end

    assert_equal "Act I", document.shortcut.label
    assert_equal "/icons/write.png", document.shortcut.thumbnail
  end

  test "keeps shortcut label in sync with document title" do
    document = Document.create!(user: users(:one), title: "Working Title", content: "Draft")

    document.update!(title: "Final Title")

    assert_equal "Final Title", document.shortcut.reload.label
  end

  test "normalizes plain text content into canonical ast" do
    document = Document.create!(user: users(:one), title: "Draft", content: "hello\nworld")

    assert_equal "doc", document.content_ast["type"]
    assert_equal "paragraph", document.content_ast["children"].first["type"]
    assert_equal "hello", document.content_ast["children"].first["children"].first["text"]
    assert_equal "world", document.content_ast["children"].second["children"].first["text"]
  end

  test "renders canonical ast as paragraph html" do
    document = Document.create!(
      user: users(:one),
      title: "Draft",
      content_ast: {
        "type" => "doc",
        "version" => 1,
        "children" => [
          {
            "type" => "paragraph",
            "children" => [
              { "type" => "text", "text" => "hello" },
              { "type" => "hard_break" },
              { "type" => "text", "text" => "world" }
            ]
          }
        ]
      }
    )

    assert_equal "<p>hello<br>world</p>", document.editor_html
    assert_equal "hello\nworld", document.content
  end
end
