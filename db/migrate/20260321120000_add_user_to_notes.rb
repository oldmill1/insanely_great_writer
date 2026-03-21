class AddUserToNotes < ActiveRecord::Migration[8.1]
  def change
    add_reference :notes, :user, type: :string, foreign_key: true
  end
end
