require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "does not backfill default static shortcuts on home load" do
    Shortcut.where(label: [ "New Draft", "New Scene" ]).delete_all

    get root_path
    assert_response :success

    assert_equal 0, Shortcut.where(label: [ "New Draft", "New Scene" ]).count
  end

  test "backfills missing document shortcuts only for the logged-in user" do
    owner_document = Document.create!(user: users(:one), title: "Backfill Me", content: "Body")
    owner_document.shortcut.destroy!

    other_user_document = Document.create!(user: users(:two), title: "Do Not Backfill", content: "Body")
    other_user_document.shortcut.destroy!

    sign_in_as(users(:one))
    get root_path
    assert_response :success

    assert_equal "Backfill Me", owner_document.reload.shortcut.label
    assert_nil other_user_document.reload.shortcut
  end

  test "renders only shortcuts for the logged-in user" do
    Document.create!(user: users(:one), title: "Chapter 1", content: "Start")
    Document.create!(user: users(:two), title: "Hidden Chapter", content: "Middle")

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, "Chapter 1"
    assert_not_includes response.body, "Hidden Chapter"
    assert_includes response.body, "Trash"
    assert_includes response.body, "&quot;document_id&quot;"
  end

  test "does not render shortcuts for soft-deleted documents" do
    deleted_document = Document.create!(user: users(:one), title: "Archived", content: "", is_deleted: true)
    deleted_document.create_desktop_shortcut! if deleted_document.shortcut.blank?

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_not_includes response.body, "Archived"
  end

  test "does not load user notes or user shortcuts when not authed" do
    Note.create!(title: "Private Note", content: "Body", expanded: true, top: 55, left: 48)
    Document.create!(user: users(:one), title: "Private Draft", content: "Hidden")

    get root_path

    assert_response :success
    assert_includes response.body, "Trash"
    assert_not_includes response.body, "Private Note"
    assert_not_includes response.body, "Private Draft"
    assert_not_includes response.body, "&quot;document_id&quot;"
  end

  test "renders system trash shortcut without creating a record" do
    Shortcut.where(label: "Trash").delete_all

    get root_path

    assert_response :success
    assert_includes response.body, "Trash"
    assert_equal 0, Shortcut.where(label: "Trash").count
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
    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, "Logout"
    assert_includes response.body, "User Settings"
    assert_not_includes response.body, "Login"
    assert_not_includes response.body, "Register"
  end

  test "does not backfill demo notes on home load" do
    Note.delete_all

    get root_path

    assert_response :success
    assert_equal 0, Note.count
    assert_not_includes response.body, "ig-note__titlebar"
  end

  test "does not render a default desktop window" do
    get root_path

    assert_response :success
    assert_not_includes response.body, 'data-desktop-window-key="welcome_window"'
    assert_not_includes response.body, "ig-window__title\">Welcome"
  end

  private

  def sign_in_as(user)
    post user_session_path, params: {
      user: {
        email: user.email,
        password: "StrongPass123"
      }
    }

    follow_redirect! if response.redirect?
  end
end
