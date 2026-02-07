class ConvertToEdgeOffsets < ActiveRecord::Migration[8.1]
  def up
    add_column :notes, :top, :integer
    add_column :notes, :right, :integer
    add_column :notes, :bottom, :integer
    add_column :notes, :left, :integer

    add_column :shortcuts, :top, :integer
    add_column :shortcuts, :right, :integer
    add_column :shortcuts, :bottom, :integer
    add_column :shortcuts, :left, :integer

    execute <<~SQL.squish
      UPDATE shortcuts
      SET top = y,
          left = x
    SQL

    execute <<~SQL.squish
      UPDATE notes
      SET top = 55,
          left = 48
    SQL

    remove_column :shortcuts, :x, :integer
    remove_column :shortcuts, :y, :integer
  end

  def down
    add_column :shortcuts, :x, :integer
    add_column :shortcuts, :y, :integer

    execute <<~SQL.squish
      UPDATE shortcuts
      SET x = left,
          y = top
    SQL

    remove_column :shortcuts, :top, :integer
    remove_column :shortcuts, :right, :integer
    remove_column :shortcuts, :bottom, :integer
    remove_column :shortcuts, :left, :integer

    remove_column :notes, :top, :integer
    remove_column :notes, :right, :integer
    remove_column :notes, :bottom, :integer
    remove_column :notes, :left, :integer
  end
end
