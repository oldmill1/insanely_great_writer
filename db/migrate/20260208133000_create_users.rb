class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users, id: false do |t|
      t.string :id, null: false, primary_key: true
      t.string :timezone, null: false

      t.timestamps
    end
  end
end
