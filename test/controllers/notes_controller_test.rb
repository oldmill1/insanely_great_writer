require "test_helper"

class NotesControllerTest < ActionDispatch::IntegrationTest
  test "creates a note for the signed-in user" do
    sign_in_as(users(:one))

    assert_difference -> { users(:one).notes.count }, 1 do
      post "/notes", params: { top: 140, left: 180 }, as: :json
    end

    assert_response :created

    note = users(:one).notes.order(:created_at).last
    assert_equal 140, note.top
    assert_equal 180, note.left
    assert_equal "", note.content

    payload = JSON.parse(response.body)
    assert_includes payload["html"], "/notes/#{note.id}/position"
  end

  test "updates note content for the signed-in owner" do
    sign_in_as(users(:one))
    note = notes(:one)

    patch "/notes/#{note.id}", params: { note: { content: "<p>Saved body</p>" } }, as: :json

    assert_response :success
    assert_equal "<p>Saved body</p>", note.reload.content
  end

  test "updates note position with edge offsets" do
    sign_in_as(users(:one))
    note = notes(:one)

    patch "/notes/#{note.id}/position", params: {
      top: 46,
      left: 53,
      right: nil,
      bottom: nil
    }, as: :json

    assert_response :success

    note.reload
    assert_equal 46, note.top
    assert_equal 53, note.left
    assert_nil note.right
    assert_nil note.bottom
  end

  test "updates note expanded state" do
    sign_in_as(users(:one))
    note = notes(:one)

    patch "/notes/#{note.id}/expanded", params: { expanded: false }, as: :json

    assert_response :success

    note.reload
    assert_equal false, note.expanded
  end

  test "rejects invalid expanded value" do
    sign_in_as(users(:one))
    note = notes(:one)

    patch "/notes/#{note.id}/expanded", params: { expanded: "maybe" }, as: :json

    assert_response :unprocessable_entity
    assert_equal true, note.reload.expanded
  end

  test "does not allow accessing another user's note" do
    sign_in_as(users(:one))

    patch "/notes/#{notes(:two).id}/expanded", params: { expanded: false }, as: :json

    assert_response :not_found
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
