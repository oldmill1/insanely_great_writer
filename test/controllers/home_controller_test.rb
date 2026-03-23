require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "does not backfill default static shortcuts on home load" do
    Shortcut.where(label: [ "New Draft", "New Folder" ]).delete_all

    get root_path
    assert_response :success

    assert_equal 0, Shortcut.where(label: [ "New Draft", "New Folder" ]).count
  end

  test "renders dock with new folder action" do
    sign_in_as(users(:one))

    get root_path

    assert_response :success
    assert_includes response.body, "New Document"
    assert_includes response.body, "New Folder"
    assert_includes response.body, 'data-intent="new_folder"'
    assert_includes response.body, 'data-path="/folders"'
    assert_includes response.body, 'data-parent-path="root"'
    assert_includes response.body, 'data-ig-dock-authed-value="true"'
    assert_includes response.body, 'data-ig-dock-register-path-value="/register"'
    assert_not_includes response.body, "New Scene"
  end

  test "renders dock register redirect metadata when not authed" do
    get root_path

    assert_response :success
    assert_includes response.body, 'data-ig-dock-authed-value="false"'
    assert_includes response.body, 'data-ig-dock-register-path-value="/register"'
  end

  test "backfills missing document shortcuts only for the logged-in user" do
    owner_document = Document.create!(user: users(:one), title: "Backfill Me", content: "Body", path: "root/Backfill Me")
    owner_document.shortcut.destroy!

    other_user_document = Document.create!(user: users(:two), title: "Do Not Backfill", content: "Body", path: "root/Do Not Backfill")
    other_user_document.shortcut.destroy!

    sign_in_as(users(:one))
    get root_path
    assert_response :success

    assert_equal "Backfill Me", owner_document.reload.shortcut.label
    assert_nil other_user_document.reload.shortcut
  end

  test "renders only shortcuts for the logged-in user" do
    Document.create!(user: users(:one), title: "Chapter 1", content: "Start", path: "root/Chapter 1")
    Document.create!(user: users(:two), title: "Hidden Chapter", content: "Middle", path: "root/Hidden Chapter")

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, "Chapter 1"
    assert_not_includes response.body, "Hidden Chapter"
    assert_includes response.body, "Trash"
    assert_includes response.body, "&quot;item_kind&quot;:&quot;document&quot;"
  end

  test "does not render shortcuts for soft-deleted documents" do
    deleted_document = Document.create!(user: users(:one), title: "Archived", content: "", is_deleted: true, path: "root/Archived")
    deleted_document.create_desktop_shortcut! if deleted_document.shortcut.blank?

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_not_includes response.body, "Archived"
  end

  test "does not load user notes or user shortcuts when not authed" do
    Note.create!(user: users(:one), title: "Private Note", content: "Body", expanded: true, top: 55, left: 48)
    Document.create!(user: users(:one), title: "Private Draft", content: "Hidden", path: "root/Private Draft")

    get root_path

    assert_response :success
    assert_includes response.body, "Trash"
    assert_not_includes response.body, "Private Note"
    assert_not_includes response.body, "Private Draft"
    assert_not_includes response.body, "&quot;item_kind&quot;:&quot;document&quot;"
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

  test "does not render the global menu bar" do
    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_not_includes response.body, "data-controller=\"menu-bar\""
    assert_includes response.body, 'data-controller="desktop"'
    assert_includes response.body, "aria-haspopup=\"menu\""
    assert_includes response.body, ">Note<"
  end

  test "shows logout/user settings menu when authed" do
    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, "aria-haspopup=\"menu\""
    assert_includes response.body, ">Note<"
    assert_includes response.body, "Logout"
    assert_includes response.body, "User Settings"
    assert_not_includes response.body, "Login"
    assert_not_includes response.body, "Register"
  end

  test "renders notes only for the logged-in user" do
    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, notes(:one).content
    assert_not_includes response.body, notes(:two).content
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

  test "desktop items endpoint returns current root filesystem items" do
    sign_in_as(users(:one))
    Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    Document.create!(user: users(:one), title: "Opening", content: "", path: "root/Opening")

    get "/desktop_items", as: :json

    assert_response :success
    payload = JSON.parse(response.body)
    labels = payload.fetch("shortcuts").map { |item| item.fetch("label") }
    assert_includes labels, "Chapter 1"
    assert_includes labels, "Opening"
    assert_includes labels, "Trash"
  end

  test "renders root folders and excludes nested documents from desktop" do
    Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    Document.create!(user: users(:one), title: "Inside Folder", content: "", path: "root/Chapter 1/Inside Folder")

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_includes response.body, "Chapter 1"
    assert_not_includes response.body, "Inside Folder"
    assert_includes response.body, "&quot;item_kind&quot;:&quot;folder&quot;"
  end

  test "does not render deleted root folders on desktop" do
    Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1", is_deleted: true)

    sign_in_as(users(:one))
    get root_path

    assert_response :success
    assert_not_includes response.body, "Chapter 1"
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
