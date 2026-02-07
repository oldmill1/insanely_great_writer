class CreateShortcuts < ActiveRecord::Migration[8.1]
  def change
    create_table :shortcuts do |t|
      t.string :label
      t.string :thumbnail
      t.integer :x
      t.integer :y

      t.timestamps
    end
  end
end
