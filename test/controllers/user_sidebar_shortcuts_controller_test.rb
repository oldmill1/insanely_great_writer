require "test_helper"

class UserSidebarShortcutsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "creates a folder sidebar shortcut for the signed-in user" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")

    assert_difference("UserSidebarShortcut.count", 1) do
      post user_sidebar_shortcuts_path, params: { item_kind: "folder", item_id: folder.id }, as: :json
    end

    assert_response :success
    shortcut = UserSidebarShortcut.order(id: :desc).first
    payload = JSON.parse(response.body)

    assert_equal users(:one), shortcut.user
    assert_equal "folder", shortcut.item_kind
    assert_equal folder.id, shortcut.item_id
    assert_equal "folder:#{folder.id}", shortcut.target_key
    assert_equal "Chapter 1", payload.dig("shortcut", "label")
    assert_equal "/folders/#{folder.id}", payload.dig("shortcut", "show_path")
  end

  test "creates a document sidebar shortcut for the signed-in user" do
    sign_in users(:one)
    document = Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Opening")

    assert_difference("UserSidebarShortcut.count", 1) do
      post user_sidebar_shortcuts_path, params: { item_kind: "document", item_id: document.id }, as: :json
    end

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal "document", payload.dig("shortcut", "item_kind")
    assert_equal document.id, payload.dig("shortcut", "item_id")
    assert_nil payload.dig("shortcut", "show_path")
  end

  test "does not duplicate an existing sidebar shortcut" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    users(:one).user_sidebar_shortcuts.create!(
      target_key: "folder:#{folder.id}",
      item_kind: "folder",
      item_id: folder.id,
      label: "Chapter 1",
      thumbnail: Folder::FOLDER_SHORTCUT_THUMBNAIL,
      position: 1
    )

    assert_no_difference("UserSidebarShortcut.count") do
      post user_sidebar_shortcuts_path, params: { item_kind: "folder", item_id: folder.id }, as: :json
    end

    assert_response :success
  end

  test "returns not found for another users item" do
    sign_in users(:one)
    folder = Folder.create!(user: users(:two), name: "Hidden", path: "root/Hidden")

    assert_no_difference("UserSidebarShortcut.count") do
      post user_sidebar_shortcuts_path, params: { item_kind: "folder", item_id: folder.id }, as: :json
    end

    assert_response :not_found
  end
end
