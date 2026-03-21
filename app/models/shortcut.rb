class Shortcut < ApplicationRecord
  include EdgePositionable

  belongs_to :document, optional: true
  belongs_to :folder, optional: true

  validates :label, presence: true
  validates :thumbnail, presence: true
  validate :single_item_reference

  scope :document_shortcuts, -> { where.not(document_id: nil) }
  scope :folder_shortcuts, -> { where.not(folder_id: nil) }

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

  def single_item_reference
    references = [ document_id, folder_id ].compact
    errors.add(:base, "shortcut must belong to exactly one item") unless references.one?
  end

  def default_edge_offsets
    { top: 0, left: 0 }
  end
end
