class Note < ApplicationRecord
  include EdgePositionable
  belongs_to :user

  validates :expanded, inclusion: { in: [ true, false ] }
  validates :width, numericality: { only_integer: true, greater_than_or_equal_to: 220, less_than_or_equal_to: 960 }, allow_nil: true
  validates :height, numericality: { only_integer: true, greater_than_or_equal_to: 120, less_than_or_equal_to: 720 }, allow_nil: true

  private

  def default_edge_offsets
    { top: 55, left: 48 }
  end
end
