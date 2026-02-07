class Shortcut < ApplicationRecord
  include EdgePositionable

  validates :label, presence: true
  validates :thumbnail, presence: true

  private

  def default_edge_offsets
    { top: 0, left: 0 }
  end
end
