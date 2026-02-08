class Shortcut < ApplicationRecord
  include EdgePositionable

  belongs_to :document, optional: true

  validates :label, presence: true
  validates :thumbnail, presence: true

  scope :document_shortcuts, -> { where.not(document_id: nil) }

  def self.next_grid_position
    index = count
    column = index % 4
    row = index / 4

    {
      top: 82 + (row * 108),
      right: 84 + (column * 118)
    }
  end

  private

  def default_edge_offsets
    { top: 0, left: 0 }
  end
end
