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
end
