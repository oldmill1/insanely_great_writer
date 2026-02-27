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
    assert_includes response.body, 'data-controller="doc-editor"'
    assert_includes response.body, %(data-doc-editor-save-path-value="#{doc_path(document)}")
  end

  test "updates document content for the authenticated owner" do
    user = users(:one)
    document = documents(:one)
    sign_in user

    patch doc_path(document), params: { document: { content: "Saved from autosave" } }, as: :json

    assert_response :success
    assert_equal "Saved from autosave", document.reload.content
  end

  test "updates canonical content ast and preserves line breaks" do
    user = users(:one)
    document = documents(:one)
    sign_in user

    patch doc_path(document), params: {
      document: {
        content_ast: {
          type: "doc",
          version: 1,
          children: [
            {
              type: "paragraph",
              children: [
                { type: "text", text: "hello" },
                { type: "hard_break" },
                { type: "text", text: "world" }
              ]
            }
          ]
        }
      }
    }, as: :json

    assert_response :success
    assert_equal "hello\nworld", document.reload.content
    assert_equal "doc", document.content_ast["type"]
  end

  test "updates content ast with screenplay element attrs" do
    user = users(:one)
    document = documents(:one)
    sign_in user

    patch doc_path(document), params: {
      document: {
        content_ast: {
          type: "doc",
          version: 1,
          children: [
            {
              type: "paragraph",
              attrs: { element: "scene_heading" },
              children: [
                { type: "text", text: "INT. OFFICE - DAY" }
              ]
            },
            {
              type: "paragraph",
              attrs: { element: "character" },
              children: [
                { type: "text", text: "JOHN" }
              ]
            },
            {
              type: "paragraph",
              attrs: { element: "dialogue" },
              children: [
                { type: "text", text: "Hello there." }
              ]
            }
          ]
        }
      }
    }, as: :json

    assert_response :success
    document.reload
    ast = document.content_ast

    assert_equal "scene_heading", ast["children"][0]["attrs"]["element"]
    assert_equal "character", ast["children"][1]["attrs"]["element"]
    assert_equal "dialogue", ast["children"][2]["attrs"]["element"]
    assert_equal "INT. OFFICE - DAY\nJOHN\nHello there.", document.content
  end
end
