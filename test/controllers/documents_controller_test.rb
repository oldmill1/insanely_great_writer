require "test_helper"

class DocumentsControllerTest < ActionDispatch::IntegrationTest
  test "shows a document" do
    document = documents(:one)

    get doc_path(document)

    assert_response :success
    assert_includes response.body, document.title
    assert_includes response.body, document.content
  end
end
