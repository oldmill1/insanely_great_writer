class AddUserToDocuments < ActiveRecord::Migration[8.1]
  def up
    add_reference :documents, :user, type: :string, foreign_key: true, index: true

    user_id = select_value("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")

    unless user_id.present?
      user_id = SecureRandom.uuid
      now = Time.current.to_s(:db)

      execute <<~SQL
        INSERT INTO users (id, author_name, email, encrypted_password, timezone, confirmed_at, created_at, updated_at)
        VALUES ('#{user_id}', 'Legacy Owner', 'legacy-owner-#{user_id}@example.invalid', '', 'UTC', '#{now}', '#{now}', '#{now}')
      SQL
    end

    execute <<~SQL
      UPDATE documents
      SET user_id = '#{user_id}'
      WHERE user_id IS NULL
    SQL

    change_column_null :documents, :user_id, false
  end

  def down
    remove_reference :documents, :user, type: :string, foreign_key: true, index: true
  end
end
