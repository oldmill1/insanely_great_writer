require "test_helper"

class AuthControllerTest < ActionDispatch::IntegrationTest
  test "shows login page" do
    get login_path

    assert_response :success
    assert_includes response.body, "Login"
    assert_includes response.body, "Remember me"
  end

  test "shows register page" do
    get register_path

    assert_response :success
    assert_includes response.body, "Create Account"
    assert_includes response.body, "Already have an account?"
  end
end
