require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1440, 1200 ]

  private

  def sign_in_as(user)
    visit new_user_session_path
    fill_in "Email*", with: user.email
    fill_in "Password*", with: "StrongPass123"
    click_button "Login"
    assert_text "manuscriptOS"
  end
end
