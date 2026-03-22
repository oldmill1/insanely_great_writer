class AddIsDeletedToFolders < ActiveRecord::Migration[8.1]
  def change
    add_column :folders, :is_deleted, :boolean, null: false, default: false
  end
end
