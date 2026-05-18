require "test_helper"

class AdminAccessTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test "redirects anonymous visitors to login" do
    get admin_root_path

    assert_redirected_to new_user_session_path
  end

  test "shows the admin dashboard for an allowed user" do
    with_admin_emails("fixture-user@example.com") do
      sign_in users(:one)

      get admin_root_path

      assert_response :success
      assert_includes response.body, "Users"
      assert_includes response.body, "fixture-user@example.com"
    end
  end

  test "redirects a signed-in user who is not allowed" do
    with_admin_emails("someone-else@example.com") do
      sign_in users(:one)

      get admin_root_path

      assert_redirected_to root_path
    end
  end

  private

  def with_admin_emails(value)
    previous_value = ENV["ADMIN_EMAILS"]
    ENV["ADMIN_EMAILS"] = value
    yield
  ensure
    ENV["ADMIN_EMAILS"] = previous_value
  end
end
