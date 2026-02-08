require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "backfills missing document shortcuts on home load" do
    document = Document.create!(title: "Backfill Me", content: "Body")
    document.shortcut.destroy!

    get root_path
    assert_response :success

    assert_equal "Backfill Me", document.reload.shortcut.label
  end

  test "renders all shortcuts including document shortcuts" do
    Document.create!(title: "Chapter 1", content: "Start")
    Document.create!(title: "Chapter 2", content: "Middle")

    get root_path

    assert_response :success
    assert_includes response.body, "Chapter 1"
    assert_includes response.body, "Chapter 2"
  end

  test "shows login/register menu when not authed" do
    get root_path

    assert_response :success
    assert_includes response.body, "Login"
    assert_includes response.body, "Register"
    assert_not_includes response.body, "Logout"
    assert_not_includes response.body, "User Settings"
  end

  test "shows logout/user settings menu when authed" do
    original_authed = HomeController.instance_method(:authed?)
    HomeController.define_method(:authed?) { true }

    get root_path

    assert_response :success
    assert_includes response.body, "Logout"
    assert_includes response.body, "User Settings"
    assert_not_includes response.body, "Login"
    assert_not_includes response.body, "Register"
  ensure
    HomeController.define_method(:authed?, original_authed)
  end
end
