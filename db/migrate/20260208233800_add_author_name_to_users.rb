class AddAuthorNameToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :author_name, :string, null: false, default: ""
  end
end
