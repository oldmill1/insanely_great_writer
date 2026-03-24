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

    assert_difference("Document.count", 1) do
      post documents_path
    end

    document = Document.order(id: :desc).first

    assert_redirected_to doc_path(document)
    assert_equal "Untitled Document", document.title
    assert_equal "", document.content
    assert_equal "root/Untitled Document", document.path
    assert_equal user.id, document.user_id
  end

  test "creates a nested document over json" do
    user = users(:one)
    sign_in user
    Folder.create!(user: user, name: "Chapter 1", path: "root/Chapter 1")

    assert_difference("Document.count", 1) do
      post documents_path, params: { parent_path: "root/Chapter 1" }, as: :json
    end

    assert_response :success
    document = Document.order(id: :desc).first
    assert_equal "root/Chapter 1/Untitled Document", document.path
  end

  test "creates an incremented root document when a deleted default path exists" do
    user = users(:one)
    sign_in user
    Document.create!(user: user, title: "Untitled Document", content: "", path: "root/Untitled Document", is_deleted: true)

    assert_difference("Document.count", 1) do
      post documents_path, as: :json
    end

    assert_response :success
    document = Document.order(id: :desc).first
    assert_equal "Untitled Document 2", document.title
    assert_equal "root/Untitled Document 2", document.path
  end

  test "returns a desktop item payload for root document creation over json" do
    user = users(:one)
    sign_in user

    post documents_path, as: :json

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal "document", payload.dig("desktop_item", "item_kind")
    assert_equal "Untitled Document", payload.dig("desktop_item", "label")
  end

  test "shows a document" do
    document = documents(:one)

    get doc_path(document)

    assert_response :success
    assert_includes response.body, document.title
    assert_includes response.body, document.content
  end

  test "renders the document editor without the global menu bar" do
    document = documents(:one)

    get doc_path(document)

    assert_response :success
    assert_not_includes response.body, "data-controller=\"menu-bar\""
    assert_includes response.body, 'data-controller="doc-editor"'
    assert_includes response.body, 'class="document-window__toolbar"'
    assert_includes response.body, 'class="document-window__title"'
    assert_includes response.body, "Scene Heading"
  end

  test "shows a document inside the requested turbo frame id" do
    document = documents(:one)

    get doc_path(document), params: { terminal_frame_id: "welcome_window_content" }

    assert_response :success
    assert_includes response.body, 'turbo-frame id="welcome_window_content"'
    assert_includes response.body, 'class="document-window"'
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

  test "renames a document for the authenticated owner" do
    user = users(:one)
    document = documents(:one)
    sign_in user

    patch doc_path(document), params: { document: { title: "Renamed Draft" } }, as: :json

    assert_response :success
    assert_equal "Renamed Draft", document.reload.title
    assert_equal "root/Renamed Draft", document.path
  end

  test "soft deletes a document for the authenticated owner" do
    user = users(:one)
    document = documents(:one)
    sign_in user

    patch delete_doc_path(document), as: :json

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal true, payload["deleted"]
    assert_equal "document", payload["item_kind"]
    assert_equal document.id, payload["item_id"]
    assert_equal true, document.reload.is_deleted
  end

  test "soft deletes a document and removes only the current user's matching sidebar shortcuts" do
    owner = users(:one)
    other_user = users(:two)
    document = owner.documents.create!(title: "Draft", content: "", path: "root/Draft")
    owner_shortcut = owner.user_sidebar_shortcuts.create!(
      target_key: "document:#{document.id}",
      item_kind: "document",
      item_id: document.id,
      label: document.title,
      thumbnail: Document::DOC_SHORTCUT_THUMBNAIL,
      position: UserSidebarShortcut.next_position_for(owner)
    )
    other_shortcut = other_user.user_sidebar_shortcuts.create!(
      target_key: "document:#{document.id}",
      item_kind: "document",
      item_id: document.id,
      label: document.title,
      thumbnail: Document::DOC_SHORTCUT_THUMBNAIL,
      position: UserSidebarShortcut.next_position_for(other_user)
    )
    sign_in owner

    patch delete_doc_path(document), as: :json

    assert_response :success
    assert_equal true, document.reload.is_deleted
    assert_not UserSidebarShortcut.exists?(owner_shortcut.id)
    assert UserSidebarShortcut.exists?(other_shortcut.id)
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
