require "application_system_test_case"

class DockTest < ApplicationSystemTestCase
  test "clicking new folder in the dock creates a desktop folder" do
    sign_in_as(users(:one))
    visit root_path

    assert_selector ".ig-dock__item", text: "New Folder"

    assert_difference("Folder.count", 1) do
      click_button "New Folder"
      assert_selector ".ig-shortcut__label", text: "Untitled Folder"
    end

    folder = Folder.order(id: :desc).first
    assert_equal users(:one), folder.user
    assert_equal "Untitled Folder", folder.name
    assert_equal "root/Untitled Folder", folder.path
  end

  test "going back after creating a document shows its desktop shortcut without a refresh" do
    sign_in_as(users(:one))
    visit root_path

    assert_difference("Document.count", 1) do
      click_button "New Document"
      assert_current_path(/\/docs\/\d+/)
    end

    page.go_back

    assert_current_path(root_path)
    assert_selector ".ig-shortcut__label", text: "Untitled Document"
  end
end
