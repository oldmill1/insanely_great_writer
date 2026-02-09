class Note < ApplicationRecord
  include EdgePositionable

  validates :title, presence: true
  validates :content, presence: true
  validates :expanded, inclusion: { in: [ true, false ] }

  private

  def default_edge_offsets
    { top: 55, left: 48 }
  end
end
