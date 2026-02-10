require "test_helper"

class ShortcutsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "redirects unauthenticated users when deleting a document by shortcut" do
    user = users(:one)
    document = user.documents.create!(title: "Draft", content: "")
    shortcut = document.shortcut

    patch "/shortcuts/#{shortcut.id}/delete_document"

    assert_redirected_to new_user_session_path
  end

  test "soft deletes an authenticated user's document by shortcut id" do
    user = users(:one)
    sign_in user

    document = user.documents.create!(title: "Draft", content: "")
    shortcut = document.shortcut

    patch "/shortcuts/#{shortcut.id}/delete_document"

    assert_response :success
    assert_equal true, document.reload.is_deleted
  end

  test "returns not found when deleting another user's document by shortcut id" do
    owner = users(:one)
    other_user = users(:two)
    sign_in other_user

    document = owner.documents.create!(title: "Owner Draft", content: "")
    shortcut = document.shortcut

    patch "/shortcuts/#{shortcut.id}/delete_document"

    assert_response :not_found
    assert_equal false, document.reload.is_deleted
  end
end
