require "test_helper"

class VirtualFilesystemTest < ActiveSupport::TestCase
  test "derives parent paths" do
    assert_equal "root", VirtualFilesystem.parent_path_for("root/Chapter 1")
    assert_equal "root/Chapter 1", VirtualFilesystem.parent_path_for("root/Chapter 1/Part A")
    assert_equal "root", VirtualFilesystem.parent_path_for("root")
  end

  test "increments default names per type within a parent" do
    user = users(:one)
    Folder.create!(user: user, name: "Untitled Folder", path: "root/Untitled Folder")
    Document.create!(user: user, title: "Untitled Document", content: "", path: "root/Untitled Document")

    assert_equal "Untitled Folder 2", VirtualFilesystem.next_folder_name(user: user, parent_path: "root")
    assert_equal "Untitled Document 2", VirtualFilesystem.next_document_title(user: user, parent_path: "root")
  end

  test "increments default names when deleted items still occupy the path" do
    user = users(:one)
    Folder.create!(user: user, name: "Untitled Folder", path: "root/Untitled Folder", is_deleted: true)
    Document.create!(user: user, title: "Untitled Document", content: "", path: "root/Untitled Document", is_deleted: true)

    assert_equal "Untitled Folder 2", VirtualFilesystem.next_folder_name(user: user, parent_path: "root")
    assert_equal "Untitled Document 2", VirtualFilesystem.next_document_title(user: user, parent_path: "root")
  end

  test "allows same-name folder and document in the same parent" do
    user = users(:one)

    folder = Folder.create!(user: user, name: "Chapter 1", path: "root/Chapter 1")
    document = Document.create!(user: user, title: "Chapter 1", content: "", path: "root/Chapter 1")

    assert_predicate folder, :persisted?
    assert_predicate document, :persisted?
  end

  test "rejects duplicate document paths in the same parent" do
    user = users(:one)
    Document.create!(user: user, title: "Draft", content: "", path: "root/Draft")

    duplicate = Document.new(user: user, title: "Draft", content: "", path: "root/Draft")

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:path], "has already been taken"
  end

  test "rejects duplicate folder paths in the same parent" do
    user = users(:one)
    Folder.create!(user: user, name: "Drafts", path: "root/Drafts")

    duplicate = Folder.new(user: user, name: "Drafts", path: "root/Drafts")

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:path], "has already been taken"
  end
end
