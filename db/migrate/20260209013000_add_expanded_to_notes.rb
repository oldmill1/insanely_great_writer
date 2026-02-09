class AddExpandedToNotes < ActiveRecord::Migration[8.1]
  def change
    add_column :notes, :expanded, :boolean, default: true, null: false
  end
end
