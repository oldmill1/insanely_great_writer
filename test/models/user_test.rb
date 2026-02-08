require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "assigns a UUID id and stores timezone" do
    user = User.create!(
      author_name: "Test Writer",
      email: "writer@example.com",
      password: "StrongPass123",
      password_confirmation: "StrongPass123",
      timezone: "America/New_York"
    )

    assert_match(/\A[0-9a-f\-]{36}\z/, user.id)
    assert_equal "America/New_York", user.timezone
  end

  test "rejects invalid timezone" do
    user = User.new(
      author_name: "Test Writer",
      email: "writer-2@example.com",
      password: "StrongPass123",
      password_confirmation: "StrongPass123",
      timezone: "Mars/Olympus_Mons"
    )

    assert_not user.valid?
    assert_includes user.errors[:timezone], "is not included in the list"
  end
end
