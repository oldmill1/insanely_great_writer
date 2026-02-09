require "test_helper"

class NotesControllerTest < ActionDispatch::IntegrationTest
  test "updates note position with edge offsets" do
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
    note = notes(:one)

    patch "/notes/#{note.id}/expanded", params: { expanded: false }, as: :json

    assert_response :success

    note.reload
    assert_equal false, note.expanded
  end

  test "rejects invalid expanded value" do
    note = notes(:one)

    patch "/notes/#{note.id}/expanded", params: { expanded: "maybe" }, as: :json

    assert_response :unprocessable_entity
    assert_equal true, note.reload.expanded
  end
end
