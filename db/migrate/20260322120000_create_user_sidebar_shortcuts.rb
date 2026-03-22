class CreateUserSidebarShortcuts < ActiveRecord::Migration[8.1]
  def change
    create_table :user_sidebar_shortcuts do |t|
      t.string :user_id, null: false
      t.string :target_key, null: false
      t.string :item_kind, null: false
      t.integer :item_id
      t.string :label, null: false
      t.string :thumbnail, null: false
      t.integer :position, null: false, default: 0

      t.timestamps
    end

    add_index :user_sidebar_shortcuts, [ :user_id, :target_key ], unique: true
    add_index :user_sidebar_shortcuts, [ :user_id, :position ]
    add_foreign_key :user_sidebar_shortcuts, :users
  end
end
