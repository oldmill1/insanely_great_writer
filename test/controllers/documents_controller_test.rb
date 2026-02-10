require "test_helper"

class DocumentsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "redirects unauthenticated users to login when creating a document" do
    post documents_path

    assert_redirected_to new_user_session_path
  end

  test "creates a new draft for the authenticated user and redirects to it" do
    user = users(:one)
    sign_in user

    travel_to Time.utc(2026, 2, 8, 13, 0, 0) do
      assert_difference("Document.count", 1) do
        post documents_path
      end
    end

    document = Document.order(id: :desc).first

    assert_redirected_to doc_path(document)
    assert_equal "Feb 8 - Draft", document.title
    assert_equal "", document.content
    assert_equal user.id, document.user_id
  end

  test "shows a document" do
    document = documents(:one)

    get doc_path(document)

    assert_response :success
    assert_includes response.body, document.title
    assert_includes response.body, document.content
  end

  test "shows a document inside the requested turbo frame id" do
    document = documents(:one)

    get doc_path(document), params: { terminal_frame_id: "welcome_window_content" }

    assert_response :success
    assert_includes response.body, 'turbo-frame id="welcome_window_content"'
    assert_includes response.body, 'class="doc-terminal-screen"'
  end
end
