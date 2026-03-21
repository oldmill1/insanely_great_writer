class AddVirtualFilesystem < ActiveRecord::Migration[8.1]
  def up
    execute "DELETE FROM shortcuts"
    execute "DELETE FROM documents"

    add_column :documents, :path, :string, null: false
    add_index :documents, :path, unique: true

    create_table :folders do |t|
      t.string :user_id, null: false
      t.string :name, null: false
      t.string :path, null: false

      t.timestamps
    end

    add_index :folders, :path, unique: true
    add_index :folders, :user_id
    add_foreign_key :folders, :users

    add_reference :shortcuts, :folder, foreign_key: true, index: { unique: true }
  end

  def down
    remove_reference :shortcuts, :folder, foreign_key: true, index: { unique: true }

    remove_foreign_key :folders, :users
    drop_table :folders

    remove_index :documents, :path
    remove_column :documents, :path
  end
end
