class Note < ApplicationRecord
  include EdgePositionable

  validates :title, presence: true
  validates :content, presence: true

  private

  def default_edge_offsets
    { top: 55, left: 48 }
  end
end
