require "test_helper"

class FoldersControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "creates a root folder" do
    sign_in users(:one)

    assert_difference("Folder.count", 1) do
      post folders_path, as: :json
    end

    assert_response :success
    payload = JSON.parse(response.body)
    folder = Folder.order(id: :desc).first
    assert_equal "Untitled Folder", folder.name
    assert_equal "root/Untitled Folder", folder.path
    assert_equal "folder", payload.dig("desktop_item", "item_kind")
    assert_equal "Untitled Folder", payload.dig("desktop_item", "label")
  end

  test "creates a nested folder" do
    sign_in users(:one)
    Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")

    assert_difference("Folder.count", 1) do
      post folders_path, params: { parent_path: "root/Chapter 1" }, as: :json
    end

    folder = Folder.order(id: :desc).first
    assert_equal "root/Chapter 1/Untitled Folder", folder.path
    assert_nil folder.shortcut
  end

  test "creates an incremented root folder when a deleted default path exists" do
    sign_in users(:one)
    Folder.create!(user: users(:one), name: "Untitled Folder", path: "root/Untitled Folder", is_deleted: true)

    assert_difference("Folder.count", 1) do
      post folders_path, as: :json
    end

    assert_response :success
    folder = Folder.order(id: :desc).first
    assert_equal "Untitled Folder 2", folder.name
    assert_equal "root/Untitled Folder 2", folder.path
  end

  test "shows direct children in a combined sortable list" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    Folder.create!(user: users(:one), name: "Scenes", path: "root/Chapter 1/Scenes")
    Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Chapter 1/Opening")
    Document.create!(user: users(:one), title: "Deep", content: "", path: "root/Chapter 1/Scenes/Deep")

    get folder_path(folder), params: { frame_id: "folder_window_test" }

    assert_response :success
    assert_includes response.body, "Name"
    assert_includes response.body, "Kind"
    assert_includes response.body, "Date Created"
    assert_includes response.body, "Date Modified"
    assert_includes response.body, "Scenes"
    assert_includes response.body, "Opening"
    assert_not_includes response.body, "Deep"
    assert_includes response.body, "Delete"
    assert_includes response.body, "Today"
    assert_includes response.body, 'class="folder-window__nav-button folder-window__nav-button--transport folder-window__nav-button--up"'
    assert_includes response.body, 'class="folder-window__nav-button folder-window__nav-button--transport folder-window__nav-button--back"'
    assert_includes response.body, 'class="folder-window__nav-button folder-window__nav-button--delete"'
    assert_includes response.body, 'class="folder-window__status-segment"'
    assert_includes response.body, 'data-folder-path="root/Chapter 1"'
  end

  test "shows root folder view" do
    sign_in users(:one)
    Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Opening")

    get root_folders_path, params: { frame_id: "folder_window_root_test" }

    assert_response :success
    assert_includes response.body, "root"
    assert_includes response.body, "Chapter 1"
    assert_includes response.body, "Opening"
  end

  test "soft deletes a folder recursively" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    child_folder = Folder.create!(user: users(:one), name: "Scenes", path: "root/Chapter 1/Scenes")
    child_document = Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Chapter 1/Opening")
    nested_document = Document.create!(user: users(:one), title: "Deep", content: "", path: "root/Chapter 1/Scenes/Deep")

    patch delete_folder_path(folder), as: :json

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal true, payload["deleted"]
    assert_equal "folder", payload["item_kind"]
    assert_equal folder.id, payload["item_id"]
    assert_equal true, folder.reload.is_deleted
    assert_equal true, child_folder.reload.is_deleted
    assert_equal true, child_document.reload.is_deleted
    assert_equal true, nested_document.reload.is_deleted
  end

  test "does not show deleted folders or deleted documents in folder contents" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    Folder.create!(user: users(:one), name: "Deleted Scene Folder", path: "root/Chapter 1/Deleted Scene Folder", is_deleted: true)
    Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Chapter 1/Opening", is_deleted: true)

    get folder_path(folder), params: { frame_id: "folder_window_test" }

    assert_response :success
    assert_not_includes response.body, "Deleted Scene Folder"
    assert_not_includes response.body, "Opening"
    assert_includes response.body, "No items yet."
  end

  test "returns not found when showing a deleted folder" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1", is_deleted: true)

    get folder_path(folder), params: { frame_id: "folder_window_test" }

    assert_response :not_found
  end
end
