require "test_helper"

class FolderTest < ActiveSupport::TestCase
  test "creates a desktop shortcut for root folders" do
    folder = nil

    assert_difference("Shortcut.count", 1) do
      folder = Folder.create!(user: users(:one), name: "Acts", path: "root/Acts")
    end

    assert_equal "/icons/folders/default.png", folder.shortcut.thumbnail
  end

  test "does not create a desktop shortcut for nested folders" do
    folder = Folder.create!(user: users(:one), name: "Part A", path: "root/Acts/Part A")

    assert_nil folder.shortcut
  end

  test "requires name and path" do
    folder = Folder.new(user: users(:one))

    assert_not folder.valid?
    assert_includes folder.errors[:name], "can't be blank"
    assert_includes folder.errors[:path], "can't be blank"
  end

  test "soft deletes the full subtree" do
    user = users(:one)
    folder = Folder.create!(user: user, name: "Acts", path: "root/Acts")
    child_folder = Folder.create!(user: user, name: "Scenes", path: "root/Acts/Scenes")
    child_document = Document.create!(user: user, title: "Opening", content: "", path: "root/Acts/Opening")
    nested_document = Document.create!(user: user, title: "Deep", content: "", path: "root/Acts/Scenes/Deep")

    folder.soft_delete_tree!

    assert_equal true, folder.reload.is_deleted
    assert_equal true, child_folder.reload.is_deleted
    assert_equal true, child_document.reload.is_deleted
    assert_equal true, nested_document.reload.is_deleted
  end
end
