require "test_helper"

class AuthControllerTest < ActionDispatch::IntegrationTest
  test "shows login page" do
    get new_user_session_path

    assert_response :success
    assert_includes response.body, "Login"
    assert_includes response.body, "Remember me"
  end

  test "shows register page" do
    get new_user_registration_path

    assert_response :success
    assert_includes response.body, "Create Account"
    assert_includes response.body, "Create a secure password"
  end

  test "registers a user as unconfirmed" do
    assert_difference("User.count", 1) do
      post user_registration_path, params: {
        user: {
          author_name: "New Writer",
          email: "new-writer@example.com",
          password: "StrongPass123",
          password_confirmation: "StrongPass123"
        }
      }
    end

    created_user = User.order(created_at: :desc).first
    assert_not created_user.confirmed?
    assert_equal "UTC", created_user.timezone
    assert_redirected_to root_path
  end
end
