class Note < ApplicationRecord
  include EdgePositionable
  belongs_to :user

  validates :expanded, inclusion: { in: [ true, false ] }

  private

  def default_edge_offsets
    { top: 55, left: 48 }
  end
end
