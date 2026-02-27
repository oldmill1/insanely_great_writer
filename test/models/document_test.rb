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

  test "normalization preserves valid screenplay element attrs" do
    document = Document.create!(
      user: users(:one),
      title: "Screenplay",
      content_ast: {
        "type" => "doc",
        "version" => 1,
        "children" => [
          {
            "type" => "paragraph",
            "attrs" => { "element" => "scene_heading" },
            "children" => [
              { "type" => "text", "text" => "INT. OFFICE - DAY" }
            ]
          },
          {
            "type" => "paragraph",
            "attrs" => { "element" => "dialogue" },
            "children" => [
              { "type" => "text", "text" => "Hello there." }
            ]
          }
        ]
      }
    )

    ast = document.content_ast
    assert_equal "scene_heading", ast["children"][0]["attrs"]["element"]
    assert_equal "dialogue", ast["children"][1]["attrs"]["element"]
  end

  test "normalization strips invalid screenplay element attrs" do
    document = Document.create!(
      user: users(:one),
      title: "Bad Element",
      content_ast: {
        "type" => "doc",
        "version" => 1,
        "children" => [
          {
            "type" => "paragraph",
            "attrs" => { "element" => "evil_script" },
            "children" => [
              { "type" => "text", "text" => "nope" }
            ]
          }
        ]
      }
    )

    ast = document.content_ast
    assert_nil ast["children"][0]["attrs"]
  end

  test "editor_html emits data-element attribute for screenplay paragraphs" do
    document = Document.create!(
      user: users(:one),
      title: "Formatted",
      content_ast: {
        "type" => "doc",
        "version" => 1,
        "children" => [
          {
            "type" => "paragraph",
            "attrs" => { "element" => "scene_heading" },
            "children" => [
              { "type" => "text", "text" => "INT. OFFICE - DAY" }
            ]
          },
          {
            "type" => "paragraph",
            "children" => [
              { "type" => "text", "text" => "plain text" }
            ]
          },
          {
            "type" => "paragraph",
            "attrs" => { "element" => "transition" },
            "children" => [
              { "type" => "text", "text" => "CUT TO:" }
            ]
          }
        ]
      }
    )

    html = document.editor_html
    assert_includes html, '<p data-element="scene_heading">INT. OFFICE - DAY</p>'
    assert_includes html, "<p>plain text</p>"
    assert_includes html, '<p data-element="transition">CUT TO:</p>'
  end

  test "legacy AST without attrs still renders correctly" do
    document = Document.create!(
      user: users(:one),
      title: "Legacy",
      content_ast: {
        "type" => "doc",
        "version" => 1,
        "children" => [
          {
            "type" => "paragraph",
            "children" => [
              { "type" => "text", "text" => "old doc" }
            ]
          }
        ]
      }
    )

    assert_equal "<p>old doc</p>", document.editor_html
    assert_equal "old doc", document.content
    assert_nil document.content_ast["children"][0]["attrs"]
  end
end
