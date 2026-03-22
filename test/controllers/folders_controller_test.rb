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
end
