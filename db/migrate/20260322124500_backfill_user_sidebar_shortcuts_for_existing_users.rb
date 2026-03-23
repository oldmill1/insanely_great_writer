class BackfillUserSidebarShortcutsForExistingUsers < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    say_with_time "Backfilling desktop sidebar shortcuts for existing users" do
      User.find_each do |user|
        UserSidebarShortcut.ensure_default_desktop_for(user)
      end
    end
  end

  def down
    # Intentionally keep user-created sidebar shortcuts in place.
  end
end
