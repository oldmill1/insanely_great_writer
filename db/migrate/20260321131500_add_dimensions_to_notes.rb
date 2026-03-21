class AddDimensionsToNotes < ActiveRecord::Migration[8.1]
  def change
    add_column :notes, :width, :integer
    add_column :notes, :height, :integer
  end
end
