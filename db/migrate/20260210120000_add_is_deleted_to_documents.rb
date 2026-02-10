class AddIsDeletedToDocuments < ActiveRecord::Migration[8.1]
  def change
    add_column :documents, :is_deleted, :boolean, null: false, default: false
  end
end
