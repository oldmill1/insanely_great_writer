require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "backfills missing document shortcuts on home load" do
    document = Document.create!(title: "Backfill Me", content: "Body")
    document.shortcut.destroy!

    get root_path
    assert_response :success

    assert_equal "Backfill Me", document.reload.shortcut.label
  end

  test "renders all shortcuts including document shortcuts" do
    Document.create!(title: "Chapter 1", content: "Start")
    Document.create!(title: "Chapter 2", content: "Middle")

    get root_path

    assert_response :success
    assert_includes response.body, "Chapter 1"
    assert_includes response.body, "Chapter 2"
  end
end
