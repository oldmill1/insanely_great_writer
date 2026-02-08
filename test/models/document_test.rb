require "test_helper"

class DocumentTest < ActiveSupport::TestCase
  test "creates a desktop shortcut when document is created" do
    document = nil

    assert_difference("Shortcut.count", 1) do
      document = Document.create!(title: "Act I", content: "Opening")
    end

    assert_equal "Act I", document.shortcut.label
    assert_equal "/icons/write.png", document.shortcut.thumbnail
  end

  test "keeps shortcut label in sync with document title" do
    document = Document.create!(title: "Working Title", content: "Draft")

    document.update!(title: "Final Title")

    assert_equal "Final Title", document.shortcut.reload.label
  end
end
